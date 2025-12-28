```mermaid
erDiagram
    PLAYER {
        int    p_pk PK
        string p_nick
        string p_mail UK
        string p_pass
        timestamp p_reg "User creation Day"
        date p_bir 
        utinyint p_lang FK
        utinyint p_country FK
        utinyint p_role FK
        
    }
    COUNTRY {
        utinyint Coun_pk PK
        string coun_name
    }
    P_LANGUAGE {
        utinyint lang_pk PK
        string lang_name
    }
    P_ROLE {
        utinyint role_pk PK
        string role_name
    }
    STATUS {
        utinyint status_pk PK
        string status_name
    }
    METRIC {
        utinyint metric_pk PK
        string metric_name
    }    
    MATCH {
        integer m_pk PK
        timestamp m_date "match starts"
        time    m_duration
        int     m_winner "user PK"

    }
    MATCHMETRIC {
        integer mm_match_fk FK,PK
        tinyint mm_code_fk FK,PK
        float   mm_value
    }
    COMPETITOR {
        integer mc_match_fk FK,PK
        integer mc_player_fk FK,PK
    }    
    COMPETITORMETRIC {
        integer mcm_match_fk FK,PK
        integer mcm_user_fk FK, PK
        tinyint mcm_metric_fk PK
        float   mcm_value
    } 
    PLAYER_FRIEND {
        int f_1 FK,PK
        int f_2 FK,PK
        date f_date "inicio  o fin de amistad"
        boolean f_tipo "TRUE = Creada, FALSE= Rota"
    }   
    ORGANIZATION {
        smallint org_pk OK
        string org_name
    }
    PLAYER_ORGANIZATION {
        smallint org_pk FK, PK
        int p_pk FK, PF
    }
    PLAYER }o--o{ FRIEND : has
    PLAYER ||--o{ COMPETITOR : is    
    PLAYER }o--o{ ORGANIZATION : "is member of"
    PLAYER ||--|| ROLE : has
    PLAYER ||--|| COUNTRY : has
    PLAYER ||--|| LANGUAGE : has
    PLAYER ||--|| STATUS : has
    MATCH }o--o{ MATCHMETRIC : has
    MATCH ||--o{ COMPETITOR : has
    METRIC ||--o{ MATCHMETRIC : "has values"
    METRIC ||--o{ COMPETITORMETRIC : "has values"    
    PLAYER ||--o{ COMPETITORMETRIC : has
    
```
	
